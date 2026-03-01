import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthGuard } from "./guards/auth.guard";
import type { AuthUser } from "./interfaces/auth-user.interface";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post("signup")
  signup(@Body() payload: SignupDto) {
    return this.service.signup(payload);
  }

  @Post("login")
  login(@Body() payload: LoginDto) {
    return this.service.login(payload);
  }

  @UseGuards(AuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
