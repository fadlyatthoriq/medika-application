import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardPetugasPage } from './dashboard-petugas.page';

describe('DashboardPetugasPage', () => {
  let component: DashboardPetugasPage;
  let fixture: ComponentFixture<DashboardPetugasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardPetugasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
