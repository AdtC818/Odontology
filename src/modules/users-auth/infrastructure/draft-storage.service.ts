import {
  IDraftStorageService,
  SessionDraftDTO,
} from '../domain/user.repository.interface';

export class DraftStorageService implements IDraftStorageService {
  private static readonly draftsByUser = new Map<number, SessionDraftDTO[]>();

  public async saveDraft(draft: SessionDraftDTO): Promise<void> {
    const existing = DraftStorageService.draftsByUser.get(draft.idUsuario) ?? [];
    const filtered = existing.filter((d) => d.formularioId !== draft.formularioId);
    DraftStorageService.draftsByUser.set(draft.idUsuario, [draft, ...filtered]);
  }

  public async getDraftByUser(idUsuario: number): Promise<SessionDraftDTO[]> {
    return DraftStorageService.draftsByUser.get(idUsuario) ?? [];
  }

  public async deleteDraft(idUsuario: number, formularioId: string): Promise<void> {
    const existing = DraftStorageService.draftsByUser.get(idUsuario) ?? [];
    DraftStorageService.draftsByUser.set(
      idUsuario,
      existing.filter((d) => d.formularioId !== formularioId)
    );
  }
}