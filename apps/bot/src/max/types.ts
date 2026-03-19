export interface MaxUser {
  user_id: number
  name: string
  username?: string
}

export interface MaxUpdate {
  update_type: string
  timestamp: number // Unix seconds
  update_id?: number
  chat_id: number
  user: MaxUser
}

export interface MaxGetUpdatesResponse {
  updates: MaxUpdate[]
  marker: string | null
}

export interface MaxBotInfo {
  user_id: number
  name: string
  username: string
  is_bot: boolean
}
