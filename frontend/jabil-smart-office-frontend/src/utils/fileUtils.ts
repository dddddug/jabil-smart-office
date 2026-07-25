export const fetchImageAsBase64 = async (url: string): Promise<{ base64: string, extension: string } | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image from ${url}: ${response.statusText}`);
      return null;
    }
    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const parts = url.split('.');
        const extension = parts[parts.length - 1]!;
        resolve({ base64: base64.split(',')[1] || '', extension }); // remove "data:image/jpeg;base64," part
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error fetching image ${url}:`, error);
    return null;
  }
};