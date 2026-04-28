import axios from 'axios'

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ??
    'https://k14s307.p.ssafy.io:8000/api/v1',
  timeout: 30_000, // 30초
})
