/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

// Opens a route, or every route of a controller, to requests without the main server's token.
export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC, true);
