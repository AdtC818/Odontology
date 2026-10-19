export interface OneTimeTokenProps {
  token: string;
  idUsuario: number;
  correo: string;
  creadoEn: Date;
  expiraEn: Date;
  usado: boolean;
  invalidado: boolean;
}

export class OneTimeTokenVO {
  public static readonly EXPIRATION_MINUTES = 30;

  public readonly token: string;
  public readonly idUsuario: number;
  public readonly correo: string;
  public readonly creadoEn: Date;
  public readonly expiraEn: Date;
  public readonly usado: boolean;
  public readonly invalidado: boolean;

  private constructor(props: OneTimeTokenProps) {
    if (!props.token || props.token.trim().length < 16) {
      throw new Error('El token de un solo uso no cumple con la longitud mínima de seguridad.');
    }
    this.token = props.token.trim();
    this.idUsuario = props.idUsuario;
    this.correo = props.correo.trim().toLowerCase();
    this.creadoEn = new Date(props.creadoEn.getTime());
    this.expiraEn = new Date(props.expiraEn.getTime());
    this.usado = props.usado;
    this.invalidado = props.invalidado;
  }

  public static create(params: {
    token: string;
    idUsuario: number;
    correo: string;
    now?: Date;
  }): OneTimeTokenVO {
    const creadoEn = params.now ? new Date(params.now.getTime()) : new Date();
    const expiraEn = new Date(
      creadoEn.getTime() + OneTimeTokenVO.EXPIRATION_MINUTES * 60 * 1000
    );

    return new OneTimeTokenVO({
      token: params.token,
      idUsuario: params.idUsuario,
      correo: params.correo,
      creadoEn,
      expiraEn,
      usado: false,
      invalidado: false,
    });
  }

  public static reconstitute(props: OneTimeTokenProps): OneTimeTokenVO {
    return new OneTimeTokenVO(props);
  }

  public isExpired(now: Date = new Date()): boolean {
    return now.getTime() > this.expiraEn.getTime();
  }

  public isValid(now: Date = new Date()): boolean {
    return !this.usado && !this.invalidado && !this.isExpired(now);
  }

  public assertIsValid(now: Date = new Date()): void {
    if (!this.isValid(now)) {
      throw new Error('El enlace no es válido o ya venció. Solicite uno nuevo');
    }
  }

  public markAsUsed(): OneTimeTokenVO {
    return new OneTimeTokenVO({
      token: this.token,
      idUsuario: this.idUsuario,
      correo: this.correo,
      creadoEn: this.creadoEn,
      expiraEn: this.expiraEn,
      usado: true,
      invalidado: this.invalidado,
    });
  }

  public invalidate(): OneTimeTokenVO {
    return new OneTimeTokenVO({
      token: this.token,
      idUsuario: this.idUsuario,
      correo: this.correo,
      creadoEn: this.creadoEn,
      expiraEn: this.expiraEn,
      usado: this.usado,
      invalidado: true,
    });
  }
}