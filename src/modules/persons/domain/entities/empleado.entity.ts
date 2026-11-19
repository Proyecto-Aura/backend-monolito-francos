export class EmpleadoEntity {
  constructor(
    public readonly id: string,
    public readonly persona_id: string,
    public cargo: string | null,
    public area: string | null,
    public fecha_ingreso: Date | null,
    public fecha_des_lab: Date | null,
    public estado: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
