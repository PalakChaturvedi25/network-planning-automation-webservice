// Updated RoleManagement Entity to match your database structure

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role_management')
export class RoleManagement {
  @PrimaryGeneratedColumn()
    id: number;

    @Column()
    role: string;

    @Column()
    station: string;

    @Column({ type: 'tinyint', default: 0 })
    download_allowed: number;

    @Column({ type: 'date' })
    start_date: string;

    @Column({ type: 'date' })
    end_date: string;

    @Column({ type: 'tinyint', default: 0 })
    revision_change_allowed: number;

    @Column({ type: 'tinyint', default: 0 })
    nominate_members_allowed: number;
  }