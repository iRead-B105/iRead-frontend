export type TeacherGender = 'MALE' | 'FEMALE'

export interface TeacherProfile {
  readonly email: string
  readonly name: string
  readonly organization: string | null
  readonly gender: TeacherGender | null
  readonly profileImageUrl: string | null
}

export interface LoginInput {
  readonly email: string
  readonly password: string
}

export interface TokenRefreshResult {
  readonly accessToken: string
  readonly tokenType: 'Bearer'
  readonly expiresIn: number
}

export type LoginResult = TokenRefreshResult

export interface SignUpInput {
  readonly email: string
  readonly password: string
  readonly name: string
  readonly organization: string
}

export interface SignUpResult {
  readonly teacherId: string
  readonly email: string
  readonly signUpStatus: string
}

export interface PasswordResetLinkRequestInput {
  readonly email: string
}

export interface PasswordResetConfirmInput {
  readonly token: string
  readonly newPassword: string
}
