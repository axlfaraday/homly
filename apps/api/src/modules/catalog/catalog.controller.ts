import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CatalogService } from "./catalog.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";

@Controller("catalog/services")
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get()
  list(@Query("providerId") providerId?: string) {
    return this.service.list(providerId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("provider", "admin")
  @Post()
  create(@Body() payload: CreateServiceDto, @CurrentUser() user: AuthUser) {
    return this.service.create(payload, user);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("provider", "admin")
  @Patch(":serviceId")
  update(
    @Param("serviceId") serviceId: string,
    @Body() payload: UpdateServiceDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.service.update(serviceId, payload, user);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("provider", "admin")
  @Delete(":serviceId")
  remove(@Param("serviceId") serviceId: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(serviceId, user);
  }
}
