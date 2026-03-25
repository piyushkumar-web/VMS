// import axios from 'axios';

// const api = axios.create({ baseURL: '/api' });

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('vms_token');
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// api.interceptors.response.use(
//   (res) => res,
//   (err) => {
//     if (err.response?.status === 401) {
//       localStorage.removeItem('vms_token');
//       localStorage.removeItem('vms_user');
//       window.location.href = '/';
//     }
//     return Promise.reject(err);
//   }
// );

// export default api;


import axios from 'axios';

const api = axios.create({
  baseURL: 'https://vms-3-xn2b.onrender.com/api'
});

// 🔹 Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔹 Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('vms_token');
      localStorage.removeItem('vms_user');
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

export default api;