import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  enabledServices: string[];
  iat?: number;
  exp?: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

// Hardcoded test users for POC
const TEST_USERS = [
  {
    id: 'user-001',
    email: 'admin@tenant1.com',
    // Password: 'password123'
    passwordHash: '$2b$10$YourHashedPasswordHere',
    tenantId: 'tenant-001',
    roles: ['admin'],
    enabledServices: ['notes', 'kanban'],
  },
  {
    id: 'user-002',
    email: 'user@tenant2.com',
    // Password: 'password123'
    passwordHash: '$2b$10$YourHashedPasswordHere',
    tenantId: 'tenant-002',
    roles: ['user'],
    enabledServices: ['notes'],
  },
];

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(loginDto: LoginDto, algorithm: 'HS256' | 'RS256' = 'HS256') {
    const startTime = Date.now();

    // Simple validation - find user by email (POC only)
    const user = TEST_USERS.find((u) => u.email === loginDto.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // For POC, skip password validation (in production, use bcrypt.compare)
    // const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    // if (!isPasswordValid) {
    //   throw new Error('Invalid credentials');
    // }

    // Create JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      enabledServices: user.enabledServices,
    };

    // Generate token based on algorithm
    let token: string;
    if (algorithm === 'HS256') {
      token = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'poc-secret-key-hs256',
        algorithm: 'HS256',
        expiresIn: '24h',
      });
    } else {
      // RS256 signing (requires private key)
      token = this.jwtService.sign(payload, {
        privateKey: process.env.JWT_PRIVATE_KEY || this.getTestPrivateKey(),
        algorithm: 'RS256',
        expiresIn: '24h',
      });
    }

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours in seconds
      algorithm,
      generation_time_ms: generationTime,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roles: user.roles,
      },
    };
  }

  // Test RSA key pair for POC (DO NOT use in production)
  private getTestPrivateKey(): string {
    return `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCY5U4q2UjwGX5+
c5x8tFTfMAVRbgzq4EKbTcxrKfTy3SCFaQA0JRVWY0H0QNoZJ6rCx9grR3nByKF7
3OeJJWfhqIdcNSp/ZfMq01jAvhvNXmDzh5e5JUopMSOyvIQDBS2Lo2mD0pVyUJV3
BO+UsskElZ5kMxguFAvFLTrYypY2XUTifyRY/GqXlw1xBGcKm0EGduq2PRO6PFWv
Vd8BMQxKRiynG1BZCuUPa4IeBPSlfomIKKBdgC4vupKBUSYROf4KM6LPaiawAV/P
gXlEhk8aJgtl4iT/UqAPD+WXgm4/og/g6MTrUqLxZslw9jZbgIhjke8kY4jHE4D6
YwurOhoRAgMBAAECggEADq+f5X+/gMiCHPVP566OpG2BZUPz26+01iQP6Y87JwTU
ddwTF+8j8ItSL3r3OAlWXqVBf067REDYOgSK/OJp6wP8FIBK17fcNpXcZY8dLonN
ODci/La3O+OrcSSobX3W1R3aKb5VeoiBAtCnjpnpsxYIA8ngnbRxOPxSNban3QrM
amj+/eCeQW8BUnGQw8MPozBSkdO6GeotkqTXk2VnDcMPF0r58//CrMH2JU5rWmxC
xGAWA4K+FgVXKcpPMMzQnD1rkMwOgz7ETeXJ0zfv3GYt7ZcAUw/jCdP7XBtNJXsq
OIj29v0dbwm+WfjFpIn4AoprBhm8ItNSeK8MAnK3PQKBgQDJwZ2E1cXj6mg3Wku3
149wePmVhUJKTrNxGQxnYIm+zjLyYk3VJQRzQukeicIZiHHG42igWV2kfpRQbwSl
dM7NM/oFKUtdWi6vRyJ5qHgGO9CG8KQCN+Czq4k7ZpfWw8uWB6KUEWtC0Xir2Ms1
BzEWtG+VqOP5NZYI3YRJWREMjwKBgQDCALzNjY7uYDB5EItpzs8APsJvqNq+dFkh
OqWcN+VNRk75RK2MKZXZrrcOkuVqomnMlMYVlg8ItIxTRLT6KSrrfzyXqXhnhLNv
UPAcPTBcSzLQoxPYb9ba9EJ/ux4Gg5eyrEnpcQUWBdryDSmY9vRJXLmbyh4nO/LI
L62QcVz/XwKBgGL3ASBOiBJjQhmcxjV4nFisTqkEQ98VOboJcmcnGIoqtRzmEY2y
6brsIFOleTtzDXRkykaVb3SnznKh8mKCqIpJq6NqfRheizXZK9UHSVCteH0ofxrD
dApN4zPrACINysheGGaPINEW1R1ea1convCnM3Dy9lig62aP2jrsYIuLAoGAH96b
JXFRv5sRm3G6VUFiA/pLWqh0dsEKO0k1F3qfMpiQNKaxk8rpEP+AluZOxbu0gaUW
/UjPY3C1dKBe0pGcuV8HhyqR2v+Tsn+rUhhDL4Yy7M89XVrSAtoJao5EmnFXpERl
R/IHEd0YYJcE9FntO3f+DbegSHWypmweqRHWYyUCgYAsL77kgClqzyRGhXTdVtST
eOk5Z2plZiHsHD2oUGhFke4bXpBiZZPijeve73jfTJrnw0AshNKMRB7v6Yh9VehK
Jw4wuhlCLNZ7BcihDLO0O0+WWP3du+qQqq/CUqWf/F/I9ZiQZj6gVDwSUqmA8h+o
4ZMUqRst5jQHX1S6bcfdgA==
-----END PRIVATE KEY-----`;
  }

  getTestPublicKey(): string {
    return `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmOVOKtlI8Bl+fnOcfLRU
3zAFUW4M6uBCm03Mayn08t0ghWkANCUVVmNB9EDaGSeqwsfYK0d5wcihe9zniSVn
4aiHXDUqf2XzKtNYwL4bzV5g84eXuSVKKTEjsryEAwUti6Npg9KVclCVdwTvlLLJ
BJWeZDMYLhQLxS062MqWNl1E4n8kWPxql5cNcQRnCptBBnbqtj0TujxVr1XfATEM
SkYspxtQWQrlD2uCHgT0pX6JiCigXYAuL7qSgVEmETn+CjOiz2omsAFfz4F5RIZP
GiYLZeIk/1KgDw/ll4JuP6IP4OjE61Ki8WbJcPY2W4CIY5HvJGOIxxOA+mMLqzoa
EQIDAQAB
-----END PUBLIC KEY-----`;
  }
}
