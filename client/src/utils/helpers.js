import toast from 'react-hot-toast';

export function showSuccessToast(message, options) {
  return toast.success(message, options);
}

export function showErrorToast(message, options) {
  return toast.error(message, options);
}

export function showLoadingToast(message, options) {
  return toast.loading(message, options);
}

export function dismissToast(toastId) {
  toast.dismiss(toastId);
}
