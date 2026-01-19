// Mock for react-native-file-viewer on web
const FileViewer = {
  open: async (path, options) => {
    console.warn('File viewer not supported on web');
    // Try to open in new tab if it's a URL
    if (path.startsWith('http')) {
      window.open(path, '_blank');
    }
  },
};

export default FileViewer;
