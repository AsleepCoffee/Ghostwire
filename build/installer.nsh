; Custom NSIS include for the GhostWire assisted installer.
; Adds an optional "Create a desktop shortcut" checkbox page and creates the
; shortcut only if the user opts in. electron-builder auto-includes this file.

; Guarded includes (the template also includes these).
!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!ifndef BST_CHECKED
  !define BST_CHECKED 1
!endif

; Installer-only code. electron-builder compiles the uninstaller from the same
; script with BUILD_UNINSTALLER defined, where these pages aren't referenced —
; so keep them out of that pass to avoid "function not referenced" warnings.
!ifndef BUILD_UNINSTALLER
  Var GwDesktopCheckbox
  Var GwDesktopChecked

  ; Inserted right after the "choose install directory" page.
  !macro customPageAfterChangeDir
    Page custom GwShortcutsPageCreate GwShortcutsPageLeave
  !macroend

  Function GwShortcutsPageCreate
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 28u "GhostWire always creates a Start Menu shortcut. Optionally add one to your desktop too:"
    Pop $1

    ${NSD_CreateCheckbox} 0 40u 100% 14u "Create a desktop shortcut"
    Pop $GwDesktopCheckbox
    ${NSD_Check} $GwDesktopCheckbox

    nsDialogs::Show
  FunctionEnd

  Function GwShortcutsPageLeave
    ${NSD_GetState} $GwDesktopCheckbox $GwDesktopChecked
  FunctionEnd

  ; Runs during installation — create the desktop shortcut if it was checked.
  !macro customInstall
    ${If} $GwDesktopChecked == ${BST_CHECKED}
      CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    ${EndIf}
  !macroend
!endif

; Clean the desktop shortcut up on uninstall.
!macro customUnInstall
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
!macroend
