import { SetMetadata } from '@nestjs/common';
import { Role } from '@libs/common';

export const SetRolesMetaData = (...roles: Role[]) => SetMetadata('roles', roles);
export const Public = () => SetMetadata('public', true);
