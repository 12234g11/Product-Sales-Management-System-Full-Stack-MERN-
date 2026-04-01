export const clean = (data) => {
  if (Array.isArray(data)) return data.map(clean);
  if (!data) return data;
  const obj = data.toObject ? data.toObject() : { ...data };
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};