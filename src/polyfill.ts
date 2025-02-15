export const setDifference = <T>(setA: Set<T>, setB: Set<T>): Set<T> => {
  const difference = new Set<T>();
  for (const elem of setA) {
    if (!setB.has(elem)) {
      difference.add(elem);
    }
  }
  return difference;
};
