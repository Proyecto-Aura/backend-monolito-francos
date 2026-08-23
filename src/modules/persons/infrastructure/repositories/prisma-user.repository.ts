import { Injectable } from "@nestjs/common";
import { UserEntity } from "../../domain/entities";
import { CreateUserParams, UpdateUserParams } from "../../domain/repositories/types/user-repository.types";
import { UserRepository } from "../../domain/repositories/user.repository";
import { PrismaService } from "../../../../infrastructure/database/prisma/prisma.service";
import { UserMapper } from "../mappers/user.mapper";

@Injectable()
export class PrismaUserRepository implements UserRepository{
    constructor(private readonly prisma: PrismaService){}
    async create(params: CreateUserParams): Promise<UserEntity> {
        const user = await this.prisma.user.create({
            data: params
        });
        return UserMapper.toDomain(user);
    }
    async findById(id: string): Promise<UserEntity | null> {
        const user = await this.prisma.user.findUnique({where: {id}});
        return user ? UserMapper.toDomain(user) : null; 
    }
    async findByEmailOrUsername(identificador: string): Promise<UserEntity | null> {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: 
                    [
                    {email: identificador},
                    {username: identificador}
                ]
            }
        });
        return user ? UserMapper.toDomain(user) : null;
    }
    async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
        const user = await this.prisma.user.findFirst({
            where: {
                email: email,
                ...(excludeId === undefined ? {} : {id: {not: excludeId}})
            },
            select: {id: true}
        });
        return user !== null;
    }
    async existsByUsername(username: string, excludeId?: string): Promise<boolean> {
        const user = await this.prisma.user.findFirst({
            where: {
                username: username,
                ...(excludeId === undefined ? {} : {id: {not: excludeId}})
            },
            select: {id: true}
        })
        return user !== null;
    }
    async update(id: string, params: UpdateUserParams): Promise<UserEntity> {
        const user = await this.prisma.user.update({
            data: params,
            where: {id}
        })
        return UserMapper.toDomain(user)
    }
    async setStatus(id: string, estado: boolean): Promise<UserEntity> {
        const user = await this.prisma.user.update({
            data: {estado},
            where: {id}
        })
        return UserMapper.toDomain(user);
    }

}