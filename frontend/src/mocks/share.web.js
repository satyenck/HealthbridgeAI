// Mock for react-native-share on web
const Share = {
  open: async (options) => {
    console.warn('Share not supported on web');
    if (navigator.share && options.url) {
      try {
        await navigator.share({
          title: options.title,
          url: options.url,
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    }
  },
};

export default Share;
