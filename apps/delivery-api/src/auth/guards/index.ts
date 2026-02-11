import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RiderJwtAuthGuard extends AuthGuard('rider-jwt') {}

@Injectable()
export class RiderLocalAuthGuard extends AuthGuard('rider-local') {}
