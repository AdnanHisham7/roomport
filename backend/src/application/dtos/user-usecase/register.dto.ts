export interface RegisterRequestDTO {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
}

export interface RegisterResponseDTO {
  message: string;
  user: {
    _id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}
