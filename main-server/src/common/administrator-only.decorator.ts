import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const ADMINISTRATOR_ONLY = 'administratorOnly';

// Restricts a route, or every route of a controller, to Administrators. Another signed-in User gets 403.
export const AdministratorOnly = (): CustomDecorator => SetMetadata(ADMINISTRATOR_ONLY, true);
