export const handleValidationError = (error) => {
  const errors = {};
  for (const field in error.errors) {
    errors[field] = error.errors[field].message;
  }
  return errors;
};