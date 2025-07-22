import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';

@Injectable()
export class EndpointDiscoveryService implements OnModuleInit {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  onModuleInit() {
    const httpAdapter = this.httpAdapterHost.httpAdapter;

    if (httpAdapter instanceof ExpressAdapter) {
      const expressApp = httpAdapter.getInstance();

      const routes = expressApp._router.stack
        .filter((layer) => layer.route)
        .map((layer) => {
          const path = layer.route.path;
          const methods = layer.route.methods;

          for (const method of Object.keys(methods)) {
            if (methods[method]) {
              return {
                method: method.toUpperCase(),
                path,
              };
            }
          }
        });

      const methodsToCount = ['GET', 'POST', 'PATCH', 'DELETE'];

      const methodCount = routes.reduce(
        (acc, curr) => {
          if (methodsToCount.includes(curr.method)) {
            acc[curr.method] = (acc[curr.method] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>,
      );

      console.log('🧑‍💻 NestJS Route Summary\n');
      console.log(`✅ Total: ${routes.length} endpoints\n`);

      console.log('📡 HTTP Method Breakdown:');
      for (const method of methodsToCount) {
        console.log(`${method.padEnd(6)}: ${methodCount[method] || 0}`);
      }
    } else {
      console.warn(
        'Endpoint discovery currently only supported for Express adapter.',
      );
    }
  }
}
