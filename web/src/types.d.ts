interface Window {
  google: {
    accounts: {
      id: {
        initialize: (config: any) => void;
        renderButton: (element: HTMLElement | null, options: any) => void;
      };
    };
  };
}
