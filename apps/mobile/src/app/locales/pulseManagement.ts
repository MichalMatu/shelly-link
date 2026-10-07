import type { Locale } from '../i18n.js';

type PulseManagementCopy = {
  saveAction: string;
  saveBusy: string;
  saveFailed: string;
  saveDone: string;
  deleteAction: string;
  deleteBusy: string;
  deleteTitle: string;
  deleteDetail: string;
  deleteFailed: string;
  runtimeAttention: string;
};

export const pulseManagementCopy: Record<Locale, PulseManagementCopy> = {
  pl: {
    saveAction: 'Zapisz zmiany',
    saveBusy: 'Zapisuję zmiany…',
    saveFailed: 'Nie udało się bezpiecznie zaktualizować Pulse.',
    saveDone: 'Cykl Pulse został zaktualizowany.',
    deleteAction: 'Usuń automatykę',
    deleteBusy: 'Usuwam automatykę…',
    deleteTitle: 'Usunąć automatykę Pulse?',
    deleteDetail:
      'Shelly Link zatrzyma Pulse, wymusi OFF, sprawdzi tożsamość gniazdka i usunie zarządzany skrypt Pulse. Jeśli bezpieczne usunięcie się nie powiedzie, wpis automatyki pozostanie w aplikacji.',
    deleteFailed: 'Nie udało się bezpiecznie usunąć automatyki Pulse.',
    runtimeAttention: 'Zarządzany runtime Pulse wymaga uwagi.'
  },
  en: {
    saveAction: 'Save changes',
    saveBusy: 'Saving changes…',
    saveFailed: 'The Pulse cycle could not be updated safely.',
    saveDone: 'The Pulse cycle was updated.',
    deleteAction: 'Delete automation',
    deleteBusy: 'Deleting automation…',
    deleteTitle: 'Delete Pulse automation?',
    deleteDetail:
      'Shelly Link will stop Pulse, force the relay OFF, verify the Plug identity and remove the managed Pulse script. The automation stays in the app if safe deletion fails.',
    deleteFailed: 'The Pulse automation could not be deleted safely.',
    runtimeAttention: 'The managed Pulse runtime needs attention.'
  },
  de: {
    saveAction: 'Änderungen speichern',
    saveBusy: 'Änderungen werden gespeichert…',
    saveFailed: 'Der Pulse-Zyklus konnte nicht sicher aktualisiert werden.',
    saveDone: 'Der Pulse-Zyklus wurde aktualisiert.',
    deleteAction: 'Automatisierung löschen',
    deleteBusy: 'Automatisierung wird gelöscht…',
    deleteTitle: 'Pulse-Automatisierung löschen?',
    deleteDetail:
      'Shelly Link stoppt Pulse, erzwingt OFF, prüft die Identität der Steckdose und entfernt das verwaltete Pulse-Skript. Wenn das sichere Löschen fehlschlägt, bleibt die Automatisierung in der App erhalten.',
    deleteFailed: 'Die Pulse-Automatisierung konnte nicht sicher gelöscht werden.',
    runtimeAttention: 'Die verwaltete Pulse-Laufzeit erfordert Aufmerksamkeit.'
  },
  es: {
    saveAction: 'Guardar cambios',
    saveBusy: 'Guardando cambios…',
    saveFailed: 'No se pudo actualizar de forma segura el ciclo Pulse.',
    saveDone: 'El ciclo Pulse se actualizó.',
    deleteAction: 'Eliminar automatización',
    deleteBusy: 'Eliminando automatización…',
    deleteTitle: '¿Eliminar la automatización Pulse?',
    deleteDetail:
      'Shelly Link detendrá Pulse, forzará OFF, verificará la identidad del enchufe y eliminará el script Pulse administrado. Si la eliminación segura falla, la automatización permanecerá en la aplicación.',
    deleteFailed: 'No se pudo eliminar de forma segura la automatización Pulse.',
    runtimeAttention: 'El runtime Pulse administrado requiere atención.'
  },
  fr: {
    saveAction: 'Enregistrer',
    saveBusy: 'Enregistrement…',
    saveFailed: 'Le cycle Pulse n’a pas pu être mis à jour en toute sécurité.',
    saveDone: 'Le cycle Pulse a été mis à jour.',
    deleteAction: 'Supprimer l’automatisation',
    deleteBusy: 'Suppression de l’automatisation…',
    deleteTitle: 'Supprimer l’automatisation Pulse ?',
    deleteDetail:
      'Shelly Link arrêtera Pulse, forcera OFF, vérifiera l’identité de la prise et supprimera le script Pulse géré. Si la suppression sécurisée échoue, l’automatisation restera dans l’application.',
    deleteFailed: 'L’automatisation Pulse n’a pas pu être supprimée en toute sécurité.',
    runtimeAttention: 'Le runtime Pulse géré nécessite votre attention.'
  },
  it: {
    saveAction: 'Salva modifiche',
    saveBusy: 'Salvataggio modifiche…',
    saveFailed: 'Non è stato possibile aggiornare in sicurezza il ciclo Pulse.',
    saveDone: 'Il ciclo Pulse è stato aggiornato.',
    deleteAction: 'Elimina automazione',
    deleteBusy: 'Eliminazione automazione…',
    deleteTitle: 'Eliminare l’automazione Pulse?',
    deleteDetail:
      'Shelly Link arresterà Pulse, forzerà OFF, verificherà l’identità della presa e rimuoverà lo script Pulse gestito. Se l’eliminazione sicura non riesce, l’automazione rimarrà nell’app.',
    deleteFailed: 'Non è stato possibile eliminare in sicurezza l’automazione Pulse.',
    runtimeAttention: 'Il runtime Pulse gestito richiede attenzione.'
  },
  'pt-BR': {
    saveAction: 'Salvar alterações',
    saveBusy: 'Salvando alterações…',
    saveFailed: 'Não foi possível atualizar o ciclo Pulse com segurança.',
    saveDone: 'O ciclo Pulse foi atualizado.',
    deleteAction: 'Excluir automação',
    deleteBusy: 'Excluindo automação…',
    deleteTitle: 'Excluir a automação Pulse?',
    deleteDetail:
      'O Shelly Link interromperá o Pulse, forçará OFF, verificará a identidade da tomada e removerá o script Pulse gerenciado. Se a exclusão segura falhar, a automação permanecerá no aplicativo.',
    deleteFailed: 'Não foi possível excluir a automação Pulse com segurança.',
    runtimeAttention: 'O runtime Pulse gerenciado requer atenção.'
  }
};
