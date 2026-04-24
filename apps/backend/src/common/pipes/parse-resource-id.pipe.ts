import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

/** Prisma `@default(cuid())` ids: 25 chars, lowercase alnum starting with `c`. */
const CUID_LIKE = /^c[a-z0-9]{24}$/;

@Injectable()
export class ParseResourceIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const v = typeof value === "string" ? value.trim() : "";
    if (!CUID_LIKE.test(v)) {
      throw new BadRequestException("Invalid id format");
    }
    return v;
  }
}
