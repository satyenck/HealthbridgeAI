"""
Session Manager for HIPAA-compliant session tracking
Implements 15-minute automatic session timeout with activity-based renewal
"""
import json
import secrets
import time
from typing import Optional, Dict
from uuid import UUID
import logging

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages user sessions with automatic timeout and activity tracking
    Uses Redis when available, falls back to in-memory storage for development
    """

    def __init__(self, redis_client=None, timeout_seconds: int = 900):
        """
        Initialize session manager

        Args:
            redis_client: Redis client instance (optional)
            timeout_seconds: Session timeout in seconds (default: 900 = 15 minutes)
        """
        self.redis_client = redis_client
        self.timeout_seconds = timeout_seconds
        self.in_memory_sessions: Dict[str, Dict] = {}  # Fallback storage
        self.use_redis = redis_client is not None

        if self.use_redis:
            logger.info("SessionManager initialized with Redis backend")
        else:
            logger.warning("SessionManager initialized with in-memory backend (not recommended for production)")

    def create_session(self, user_id: UUID, role: str, extra_data: Optional[Dict] = None) -> str:
        """
        Create a new session for a user

        Args:
            user_id: User's UUID
            role: User's role (PATIENT, DOCTOR, etc.)
            extra_data: Additional session data

        Returns:
            session_id: Unique session identifier
        """
        session_id = secrets.token_urlsafe(32)
        session_data = {
            "user_id": str(user_id),
            "role": role,
            "created_at": time.time(),
            "last_activity": time.time(),
            **(extra_data or {})
        }

        if self.use_redis:
            try:
                # Store in Redis with TTL
                self.redis_client.setex(
                    f"session:{session_id}",
                    self.timeout_seconds,
                    json.dumps(session_data)
                )
                logger.info(f"Session created in Redis: {session_id} for user {user_id}")
            except Exception as e:
                logger.error(f"Redis error during session creation: {e}")
                # Fallback to in-memory
                self._store_in_memory(session_id, session_data)
        else:
            self._store_in_memory(session_id, session_data)

        return session_id

    def validate_session(self, session_id: str) -> Optional[Dict]:
        """
        Validate session and extend TTL if valid

        Args:
            session_id: Session identifier to validate

        Returns:
            Session data dict if valid, None if invalid/expired
        """
        if self.use_redis:
            try:
                session_json = self.redis_client.get(f"session:{session_id}")
                if session_json:
                    session_data = json.loads(session_json)

                    # Update last activity time
                    session_data["last_activity"] = time.time()

                    # Extend TTL on activity (sliding window)
                    self.redis_client.setex(
                        f"session:{session_id}",
                        self.timeout_seconds,
                        json.dumps(session_data)
                    )

                    logger.debug(f"Session validated and renewed: {session_id}")
                    return session_data
                else:
                    logger.warning(f"Session not found or expired: {session_id}")
                    return None
            except Exception as e:
                logger.error(f"Redis error during session validation: {e}")
                # Check in-memory fallback
                return self._validate_in_memory(session_id)
        else:
            return self._validate_in_memory(session_id)

    def invalidate_session(self, session_id: str) -> bool:
        """
        Invalidate/delete a session (logout)

        Args:
            session_id: Session to invalidate

        Returns:
            True if session was deleted, False otherwise
        """
        if self.use_redis:
            try:
                result = self.redis_client.delete(f"session:{session_id}")
                logger.info(f"Session invalidated: {session_id}")
                return result > 0
            except Exception as e:
                logger.error(f"Redis error during session invalidation: {e}")
                return self._invalidate_in_memory(session_id)
        else:
            return self._invalidate_in_memory(session_id)

    def get_session_info(self, session_id: str) -> Optional[Dict]:
        """
        Get session information without extending TTL

        Args:
            session_id: Session identifier

        Returns:
            Session data dict if exists, None otherwise
        """
        if self.use_redis:
            try:
                session_json = self.redis_client.get(f"session:{session_id}")
                if session_json:
                    return json.loads(session_json)
                return None
            except Exception as e:
                logger.error(f"Redis error getting session info: {e}")
                return self._get_in_memory(session_id)
        else:
            return self._get_in_memory(session_id)

    def get_user_sessions(self, user_id: UUID) -> list:
        """
        Get all active sessions for a user

        Args:
            user_id: User's UUID

        Returns:
            List of session IDs
        """
        if self.use_redis:
            try:
                # Scan for all sessions
                sessions = []
                for key in self.redis_client.scan_iter(match="session:*"):
                    session_json = self.redis_client.get(key)
                    if session_json:
                        session_data = json.loads(session_json)
                        if session_data.get("user_id") == str(user_id):
                            sessions.append(key.decode().replace("session:", ""))
                return sessions
            except Exception as e:
                logger.error(f"Redis error getting user sessions: {e}")
                return []
        else:
            # Search in-memory
            sessions = []
            for sid, data in self.in_memory_sessions.items():
                if data.get("user_id") == str(user_id):
                    sessions.append(sid)
            return sessions

    def invalidate_all_user_sessions(self, user_id: UUID) -> int:
        """
        Invalidate all sessions for a user (force logout all devices)

        Args:
            user_id: User's UUID

        Returns:
            Number of sessions invalidated
        """
        sessions = self.get_user_sessions(user_id)
        count = 0
        for session_id in sessions:
            if self.invalidate_session(session_id):
                count += 1
        logger.info(f"Invalidated {count} sessions for user {user_id}")
        return count

    # In-memory storage methods (fallback)

    def _store_in_memory(self, session_id: str, session_data: Dict):
        """Store session in memory with expiry time"""
        session_data["expires_at"] = time.time() + self.timeout_seconds
        self.in_memory_sessions[session_id] = session_data
        logger.debug(f"Session stored in memory: {session_id}")

    def _validate_in_memory(self, session_id: str) -> Optional[Dict]:
        """Validate and renew in-memory session"""
        session = self.in_memory_sessions.get(session_id)
        if session:
            # Check if expired
            if time.time() > session.get("expires_at", 0):
                del self.in_memory_sessions[session_id]
                logger.warning(f"In-memory session expired: {session_id}")
                return None

            # Renew expiry on activity
            session["last_activity"] = time.time()
            session["expires_at"] = time.time() + self.timeout_seconds
            return session
        return None

    def _get_in_memory(self, session_id: str) -> Optional[Dict]:
        """Get in-memory session without renewal"""
        session = self.in_memory_sessions.get(session_id)
        if session and time.time() <= session.get("expires_at", 0):
            return session
        return None

    def _invalidate_in_memory(self, session_id: str) -> bool:
        """Delete in-memory session"""
        if session_id in self.in_memory_sessions:
            del self.in_memory_sessions[session_id]
            logger.debug(f"In-memory session invalidated: {session_id}")
            return True
        return False

    def cleanup_expired_sessions(self):
        """Clean up expired in-memory sessions (Redis handles this automatically)"""
        if not self.use_redis:
            current_time = time.time()
            expired = [
                sid for sid, data in self.in_memory_sessions.items()
                if current_time > data.get("expires_at", 0)
            ]
            for sid in expired:
                del self.in_memory_sessions[sid]
            if expired:
                logger.info(f"Cleaned up {len(expired)} expired in-memory sessions")


# Global session manager instance
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """
    Get or create global session manager instance

    Returns:
        SessionManager instance
    """
    global _session_manager

    if _session_manager is None:
        # Try to initialize with Redis
        try:
            import redis
            from app.config import settings

            redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=False,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            # Test connection
            redis_client.ping()
            _session_manager = SessionManager(
                redis_client=redis_client,
                timeout_seconds=settings.SESSION_TIMEOUT_SECONDS
            )
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}. Using in-memory session storage.")
            from app.config import settings
            _session_manager = SessionManager(
                redis_client=None,
                timeout_seconds=settings.SESSION_TIMEOUT_SECONDS
            )

    return _session_manager
