import { Body, Controller, Delete, Get, Headers, Post, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

class SignupDto {
  email!: string
  password!: string
  name?: string
  full_name?: string
}

class SigninDto {
  email!: string
  password!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup({
      email: body.email,
      password: body.password,
      name: body.name || body.full_name,
    })
  }

  @Post('signin')
  signin(@Body() body: SigninDto) {
    return this.authService.signin(body.email, body.password)
  }

  @Post('login')
  login(@Body() body: SigninDto) {
    return this.authService.signin(body.email, body.password)
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '')
    if (!token) throw new UnauthorizedException('Missing bearer token')
    return this.authService.me(token)
  }

  @Delete('logout')
  logout() {
    return { success: true }
  }

  @Post('logout')
  logoutPost() {
    return { success: true }
  }
}
