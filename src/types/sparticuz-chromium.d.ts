declare module "@sparticuz/chromium" {
  const chromium: {
    args: string[];
    headless: boolean;
    executablePath(path?: string): Promise<string>;
  };
  export default chromium;
}
