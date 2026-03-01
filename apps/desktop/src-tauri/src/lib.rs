use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let updater = match handle.updater() {
                    Ok(u) => u,
                    Err(e) => {
                        eprintln!("[updater] init failed: {e}");
                        return;
                    }
                };

                match updater.check().await {
                    Ok(Some(update)) => {
                        let version = update.version.clone();
                        let body = update.body.clone().unwrap_or_default();

                        let confirmed = handle
                            .dialog()
                            .message(format!(
                                "新しいバージョン v{version} が利用可能です。\n\n{body}\n\nアップデートしますか？"
                            ))
                            .title("Todome アップデート")
                            .kind(MessageDialogKind::Info)
                            .buttons(MessageDialogButtons::OkCancelCustom(
                                "アップデート".into(),
                                "後で".into(),
                            ))
                            .blocking_show();

                        if confirmed {
                            if let Err(e) = update.download_and_install(|_, _| {}, || {}).await {
                                eprintln!("[updater] install failed: {e}");
                                handle
                                    .dialog()
                                    .message(format!("アップデートに失敗しました:\n{e}"))
                                    .title("エラー")
                                    .kind(MessageDialogKind::Error)
                                    .blocking_show();
                            }
                        }
                    }
                    Ok(None) => {}
                    Err(e) => eprintln!("[updater] check failed: {e}"),
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
