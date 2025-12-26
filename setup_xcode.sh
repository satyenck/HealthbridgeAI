#!/bin/bash
# HealthbridgeAI - Xcode Setup Script
# Run this after Xcode installation completes

echo "🔧 Setting up Xcode for HealthbridgeAI..."
echo ""

# Check if Xcode is installed
if [ ! -d "/Applications/Xcode.app" ]; then
    echo "❌ Xcode not found in /Applications/Xcode.app"
    echo "Please install Xcode from the App Store first"
    exit 1
fi

echo "✅ Xcode found!"
echo ""

# Accept license
echo "📝 Accepting Xcode license..."
sudo xcodebuild -license accept
echo "✅ License accepted"
echo ""

# Switch command line tools
echo "🔧 Configuring command line tools..."
sudo xcode-select --switch /Applications/Xcode.app
echo "✅ Command line tools configured"
echo ""

# Run first launch
echo "🚀 Running first launch setup..."
xcodebuild -runFirstLaunch
echo "✅ First launch complete"
echo ""

# Verify installation
echo "🔍 Verifying installation..."
xcodebuild -version
echo ""

echo "✅ Xcode setup complete!"
echo ""
echo "📱 Ready to launch the app!"
echo ""
echo "Next step: Run the iOS app"
echo "  cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend"
echo "  npm run ios"
echo ""
