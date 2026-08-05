export interface JwtPayload {
    sub: string;
    name: string;
    role: string;
    cabinetId: string;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
