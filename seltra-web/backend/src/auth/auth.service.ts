//seltra/backend/src/auth/auth.service.ts
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { prisma } from '../db'

//Merchant credentials
//We will disable this for now since merchants will be onboarded manually first 50 merchants
type SignupInput = {
  email: string
  password: string
  name?: string
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

//disable
  async signup(input: SignupInput) {
    const email = input.email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new ConflictException('Email is already registered')

    const passwordHash = await bcrypt.hash(input.password, 12)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: input.name?.trim() || email.split('@')[0],
      },
    })

    return this.authPayload(user)
  }

  async signin(emailInput: string, password: string) {
    const email = emailInput.trim().toLowerCase()
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw new UnauthorizedException('Invalid email or password')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid email or password')

    return this.authPayload(user)
  }

  
  async me(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET || 'change-me',
      })
      const user = await prisma.user.findUnique({ where: { id: payload.sub } })
      if (!user) throw new UnauthorizedException('User not found')
      return { user: this.publicUser(user) }
    } catch {
      throw new UnauthorizedException('Invalid bearer token')
    }
  }

  private authPayload(user: { id: string; email: string; name: string | null; createdAt?: Date }) {
    const publicUser = this.publicUser(user)
    const token = this.jwtService.sign({ sub: user.id, email: user.email })
    return {
      token,
      access_token: token,
      user: publicUser,
    }
  }

  private publicUser(user: { id: string; email: string; name: string | null; createdAt?: Date }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.createdAt?.toISOString(),
      createdAt: user.createdAt?.toISOString(),
      user_metadata: {
        name: user.name || undefined,
        full_name: user.name || undefined,
      },
    }
  }
}
