export const clean = (data) => {
  if (Array.isArray(data)) {
    return data.map(clean);
  }
  const obj = data.toObject ? data.toObject() : { ...data };
  delete obj.__v;
  return obj;
};
