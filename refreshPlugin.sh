#!/bin/sh

#Define Variables
streamdeckBrand='ajazz' # elgato || ajazz
pluginName='com.duboox.streamdeck.smartthings'
projectDir=$(PWD)
typeOsBrand="$OSTYPE-$streamdeckBrand"


# Define OS-Brands for kill deck process
declare -a killProcess
killProcess[msys-elgato]="taskkill /IM \"StreamDeck.exe\" /F" # Windows El Gato
killProcess[darwin24-elgato]="pkill 'Stream Deck'"  # MAC El Gato
killProcess[msys-ajazz]="taskkill /IM \"StreamDockAJAZZ.exe\" /F" # Windows Ajazz
killProcess[darwin24-ajazz]="pkill 'Stream Dock AJAZZ'" # MAC Ajazz

# Define OS-Brands for pluginsDir
declare -a pluginsDirs
pluginsDirs[msys-elgato]="$HOME\AppData\Roaming\Elgato\StreamDeck\Plugins" # Windows El Gato
pluginsDirs[darwin24-elgato]="$HOME/Library/Application Support/com.elgato.StreamDeck/Plugins"  # MAC El Gato
pluginsDirs[msys-ajazz]="$HOME\AppData\Roaming\HotSpot\StreamDeck\plugins" # Windows Ajazz
pluginsDirs[darwin24-ajazz]="$HOME/Library/Application Support/HotSpot/StreamDock/plugins" # MAC Ajazz

# Define OS-Brands for Re-Open deck process
declare -a openProcess
openProcess[msys-elgato]="'C:\Program Files\Elgato\StreamDeck\StreamDeck.exe' &" # Windows El Gato
openProcess[darwin24-elgato]="open /Applications/Elgato\ Stream\ Deck.app &"  # MAC El Gato
openProcess[msys-ajazz]="'C:\Program Files\Hotspot\StreamDeck\StreamDeck Ajazz.exe' &" # Windows Ajazz
openProcess[darwin24-ajazz]="open /Applications/Stream\ Dock\ AJAZZ.app &" # MAC Ajazz

echo "Killing the Stream Deck process $typeOsBrand"
eval "${killProcess[$typeOsBrand]}"

# Define PluginsDir
pluginsDir="${pluginsDirs[$typeOsBrand]}"

# echo 'Building from sources'
npm run build

echo "Installing the $pluginName plugin to $pluginsDir"

# Push the plugins directory on the stack
pushd "$pluginsDir"

# Check if the plugin directory exists and remove it
[ -d "$pluginName.sdPlugin" ] && rm -r $pluginName.sdPlugin
# Create the plugins directory
mkdir $pluginName.sdPlugin

# Copy content from local folder to Application folder
if [[ "$OSTYPE" == "msys" ]]; then
  cp -R "$projectDir/$pluginName.sdPlugin" .
else
  cp -R "$projectDir/$pluginName.sdPlugin/" $pluginName.sdPlugin
fi

# Pop the plugins directory off the stack returning to where we were
popd

echo "Done installing ${pluginName}"

# Reopen the Stream Deck app on background
eval "${openProcess[$typeOsBrand]}"