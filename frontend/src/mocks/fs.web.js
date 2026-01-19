// Mock for react-native-fs on web
const RNFS = {
  DocumentDirectoryPath: '/documents',
  CachesDirectoryPath: '/cache',
  ExternalStorageDirectoryPath: '/external',

  readFile: async (path) => {
    console.warn('File system not supported on web');
    return '';
  },

  writeFile: async (path, contents) => {
    console.warn('File system not supported on web');
  },

  exists: async (path) => {
    return false;
  },

  unlink: async (path) => {
    console.warn('File system not supported on web');
  },

  mkdir: async (path) => {
    console.warn('File system not supported on web');
  },

  downloadFile: (options) => {
    console.warn('File download not supported on web');
    return {
      promise: Promise.resolve({ statusCode: 404 }),
      jobId: -1,
    };
  },

  readDir: async (path) => {
    return [];
  },
};

export default RNFS;
