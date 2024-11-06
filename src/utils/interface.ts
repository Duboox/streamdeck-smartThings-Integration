import { SelectElement } from './index'
import { KeyUpEvent, SDOnActionEvent, StateType, StreamDeckAction } from 'streamdeck-typescript'

export interface GlobalSettingsInterface {
  accessToken: string
}

export interface CommonSettingsInterface {
  selectOptions?: SelectElement[]
}
export interface SceneSettingsInterface extends CommonSettingsInterface {
  sceneId: string
}

export interface DeviceSettingsInterface extends CommonSettingsInterface {
  deviceId: string
  behaviour: string
  colors?: string[]
}