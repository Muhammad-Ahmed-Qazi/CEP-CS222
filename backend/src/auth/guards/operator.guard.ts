import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class OperatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || (user.role !== 'operator' && user.role !== 'admin')) {
      throw new ForbiddenException(
        'You do not have permission to perform this action. Operator or Admin role required.',
      );
    }

    return true;
  }
}
