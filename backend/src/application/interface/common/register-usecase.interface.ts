import {
  RegisterRequestDTO,
  RegisterResponseDTO,
} from "../../dtos/user-usecase/register.dto";

export interface IRegisterUseCase {
  register(data: RegisterRequestDTO): Promise<RegisterResponseDTO>;
}
