export function removeKeys<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const newObj = { ...obj };
  keys.forEach((key) => {
    delete newObj[key];
  });
  return newObj;
}

export function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
