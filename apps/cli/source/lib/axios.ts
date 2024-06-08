import axios from 'axios';
import {getAuthHeaders} from './utils.js';

export const apiAxios = axios.create({
	baseURL: !!process.env['CONVECT_USE_LOCAL']
		? 'http://localhost:3000'
		: 'https://convect.xyz',
	headers: getAuthHeaders(),
});
