import axios from 'axios';
import {getAuthHeaders} from './utils.js';

export const apiAxios = axios.create({
	baseURL: 'https://www.convect.xyz',
	headers: getAuthHeaders(),
});
