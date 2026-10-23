import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import type { UserProfileDto, UpdateProfileDto } from '@haraka/shared-types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      displayName: user.displayName,
      preferredLanguage: user.preferredLanguage,
      roles: user.roles as any,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        email: dto.email,
        preferredLanguage: dto.preferredLanguage,
      },
    });

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      displayName: user.displayName,
      preferredLanguage: user.preferredLanguage,
      roles: user.roles as any,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
