import { SDOnPiEvent, StreamDeckPropertyInspectorHandler, DidReceiveSettingsEvent } from "streamdeck-typescript";
import {
  isGlobalSettingsSet,
  fetchApi,
  addSelectOption,
  SelectElement,
  isDeviceSetting,
  isSceneSetting,
} from "./utils/index";
import { GlobalSettingsInterface, SceneSettingsInterface, DeviceSettingsInterface } from "./utils/interface";
import { PagedResult, SceneSummary, DeviceList } from "@smartthings/core-sdk";

const pluginName = "com.duboox.streamdeck";

class SmartthingsPI extends StreamDeckPropertyInspectorHandler {
  private selectOptions?: SelectElement[];
  private selectedBehaviour = "toggle";
  private selectedOptionId: string;

  constructor() {
    super();
  }

  @SDOnPiEvent("documentLoaded")
  onDocumentLoaded(): void {
    const willDebug = true;

    const validateButton = document.getElementById("validate_button") as HTMLButtonElement;
    const patButton = document.getElementById("pat_button") as HTMLButtonElement;
    const selectLabel = document.getElementById("select_label") as HTMLSelectElement;
    const select = document.getElementById("select_value") as HTMLSelectElement;
    const behaviour = document.getElementById("behaviour") as HTMLDivElement;
    const colorsInput = document.getElementById("colors-inputs") as HTMLDivElement;
    const saveColorsButton = document.getElementById("save_colors") as HTMLButtonElement;
    const debug = document.getElementById("debug") as HTMLDivElement;

    validateButton?.addEventListener("click", this.onValidateButtonPressed.bind(this));
    patButton?.addEventListener("click", this.onPatButtonPressed.bind(this));
    select?.addEventListener("change", this.onSelectChanged.bind(this));
    behaviour?.addEventListener("change", this.onRadioChanged.bind(this));
    saveColorsButton?.addEventListener("click", this.onSaveColorsButtonPressed.bind(this));

    switch (this.actionInfo.action) {
      case pluginName + ".device": {
        selectLabel.textContent = "Devices";
        patButton.textContent = "Get Personal Access Token";
        validateButton.textContent = "Fetch devices list";
        addSelectOption({ select: select, element: { id: "none", name: "No device" } });
        behaviour.className = "sdpi-item"; // Remove hidden class and display radio selection

        // Only for Debug
        if (willDebug) {
          debug.className = "sdpi-item";
        }
        break;
      }
      case pluginName + ".scene": {
        validateButton.textContent = "Fetch scenes list";
        selectLabel.textContent = "Scenes";
        addSelectOption({ select: select, element: { id: "none", name: "No scene" } });
        break;
      }
    }
  }

  private onPatButtonPressed() {
    window.open("https://account.smartthings.com/tokens");
  }

  private onSaveColorsButtonPressed() {
    const qtyColors = 5;
    const finalColors = [];

    for (let i = 1; i <= qtyColors; i++) {
      const colorValue = (<HTMLInputElement>document.getElementById(`color-${i}`))?.value;
      if (/^#[0-9A-F]{6}$/i.test(colorValue)) {
        finalColors.push(colorValue);
      }
    }
    this.setSettings<DeviceSettingsInterface>({
      selectOptions: this.selectOptions,
      deviceId: this.selectedOptionId,
      behaviour: this.selectedBehaviour,
      colors: finalColors,
    });
    // Only for Debug
    const debugInfo = document.getElementById("debug-info") as HTMLDivElement;
    debugInfo.innerText = finalColors.toString();
  }

  private async onValidateButtonPressed() {
    const accessToken = (<HTMLInputElement>document.getElementById("accesstoken"))?.value;
    this.settingsManager.setGlobalSettings<GlobalSettingsInterface>({ accessToken });

    let elements: SelectElement[] = [];

    switch (this.actionInfo.action) {
      case pluginName + ".scene": {
        const res = await fetchApi<PagedResult<SceneSummary>>({
          endpoint: "/scenes",
          method: "GET",
          accessToken,
        });
        elements = res.items.map((item) => ({
          id: item.sceneId,
          name: item.sceneName,
        }));
        break;
      }
      case pluginName + ".device": {
        const res = await fetchApi<DeviceList>({
          endpoint: "/devices",
          method: "GET",
          accessToken,
        });
        elements = res.items.map((item) => ({
          id: item.deviceId,
          name: item.label,
        }));
        break;
      }
    }

    this.setSettings({
      selectOptions: elements,
      behaviour: this.selectedBehaviour,
    });
    this.requestSettings(); // requestSettings will add the options to the select element
  }

  public onSelectChanged(e: Event) {
    const newSelection = (e.target as HTMLSelectElement).value;
    this.selectedOptionId = newSelection;
    switch (this.actionInfo.action) {
      case pluginName + ".scene": {
        this.setSettings<SceneSettingsInterface>({
          selectOptions: this.selectOptions,
          sceneId: newSelection,
        });
        break;
      }
      case pluginName + ".device": {
        this.setSettings<DeviceSettingsInterface>({
          selectOptions: this.selectOptions,
          deviceId: newSelection,
          behaviour: this.selectedBehaviour,
        });
        break;
      }
    }
  }

  public onRadioChanged(e: Event) {
    const newSelection = (e.target as HTMLSelectElement).value;
    // Only for Debug
    const debugInfo = document.getElementById("debug-info") as HTMLDivElement;
    debugInfo.innerText = newSelection;

    const colorsInput = document.getElementById("colors-inputs") as HTMLDivElement;
    if (newSelection === "colors") {
      colorsInput.className = "sdpi-item"; // Remove hidden class and display colors selection
    } else {
      colorsInput.className = "hidden"; // Add hidden class
    }

    switch (this.actionInfo.action) {
      case pluginName + ".device": {
        this.setSettings<DeviceSettingsInterface>({
          selectOptions: this.selectOptions,
          deviceId: this.selectedOptionId,
          behaviour: newSelection,
        });
        break;
      }
    }
  }

  // Prefill PI elements from cache
  @SDOnPiEvent("globalSettingsAvailable")
  propertyInspectorDidAppear(): void {
    this.requestSettings();
    const globalSettings = this.settingsManager.getGlobalSettings<GlobalSettingsInterface>();

    if (isGlobalSettingsSet(globalSettings)) {
      const accessToken = globalSettings.accessToken;
      if (accessToken) {
        (<HTMLInputElement>document.getElementById("accesstoken")).value = accessToken;
      }
    }
  }

  // Get the devices list from cache
  @SDOnPiEvent("didReceiveSettings")
  onReceiveSettings({ payload }: DidReceiveSettingsEvent<DeviceSettingsInterface | SceneSettingsInterface>): void {
    const select = document.getElementById("select_value") as HTMLSelectElement;
    const debugInfo = document.getElementById("debug-info") as HTMLDivElement;
    this.selectOptions = payload.settings.selectOptions;
    select.length = 1; // Only keep the "No element" option
    this.selectOptions?.forEach((element) => addSelectOption({ select, element }));

    let activeIndex: number | undefined;
    if (isDeviceSetting(payload.settings)) {
      //Device Id
      const deviceId = payload.settings.deviceId;
      this.selectedOptionId = deviceId;

      //Behavior
      this.selectedBehaviour = payload.settings.behaviour;
      // debugInfo.innerText = this.selectedBehaviour;
      (document.getElementById(this.selectedBehaviour) as HTMLInputElement).checked = true;

      //Colors
      if (payload.settings.behaviour === "colors") {
        (document.getElementById("colors-inputs") as HTMLDivElement).className = "sdpi-item"; // Remove hidden class and display colors selection
        debugInfo.innerText = JSON.stringify(payload.settings)
        payload.settings.colors?.forEach((color, i) => {
          (document.getElementById(`color-${i + 1}`) as HTMLInputElement).value = color;
        });
      }

      activeIndex = this.selectOptions?.findIndex((element) => element.id === deviceId) || 0;
    }
    if (isSceneSetting(payload.settings)) {
      const sceneId = payload.settings.sceneId;
      activeIndex = this.selectOptions?.findIndex((element) => element.id === sceneId) || 0;

      this.selectedOptionId = sceneId;
    }
    select.selectedIndex = activeIndex !== undefined ? activeIndex + 1 : 0; // + 1 because of the "No element" first option
  }
}

new SmartthingsPI();
