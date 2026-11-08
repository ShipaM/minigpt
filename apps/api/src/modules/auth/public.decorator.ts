import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

//Marks an endpoint (or a whole controller) as open: the global guard lets it pass without a token.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
