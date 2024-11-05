import { DeviceAction } from './actions/device'
import { SceneAction } from './actions/scene'
import { StreamDeckPluginHandler } from 'streamdeck-typescript'

export class Smartthings extends StreamDeckPluginHandler {
  constructor() {
    super()
    new SceneAction(this, 'com.duboox.streamdeck.scene')
    new DeviceAction(this, 'com.duboox.streamdeck.device')
  }
}

new Smartthings()
