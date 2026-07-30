import {
  BootstrapRequestDTO,
  BootstrapResponseDTO,
} from "../../dtos/bootstrap/bootstrap.dto";

export interface IBootstrapUseCase {
  bootstrap(data: BootstrapRequestDTO): Promise<BootstrapResponseDTO>;
}
