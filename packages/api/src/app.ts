import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PostgresMemberRepository } from './infrastructure/PostgresMemberRepository.js';
import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository.js';
import { MemberValidator } from './domain/services/MemberValidator.js';
import { PaymentValidator } from './domain/services/PaymentValidator.js';
import { CreateMemberUseCase } from './application/NewMemberUseCase.js';
import { CreatePaymentUseCase } from './application/NewPaymentUseCase.js';
import { GetPaymentsUseCase } from './application/GetPaymentsUseCase.js';
import { GetMembersUseCase } from './application/GetMembersUseCase.js';
import { UpdateMemberUseCase } from './application/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from './application/DeleteMemberUseCase.js';
import { MemberController } from './delivery/MemberController.js';
import { PaymentController } from './delivery/PaymentController.js';
import { UpdatePaymentUseCase } from './application/UpdatePaymentUseCase.js';
import { GetPaymentByIdUseCase } from './application/GetPaymentUseCase.js';
import { CancelPaymentUseCase } from './application/CancelPaymentUseCase.js';

import { PostgresSportRepository } from './infrastructure/PostgresSportRepository.js';
import { SportValidator } from './domain/services/SportValidator.js';
import { CreateSportUseCase } from './application/NewSportUseCase.js';
import { GetSportsUseCase } from './application/GetSportsUseCase.js';
import { UpdateSportUseCase } from './application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from './application/DeleteSportUseCase.js';
import { SportController } from './delivery/SportController.js';
import { PostgresDisciplineRepository } from './infrastructure/PostgresDisciplineRepository.js';
import { DisciplineValidator } from './domain/services/DisciplineValidator.js';
import { CreateDisciplineUseCase } from './application/NewDisciplineUseCase.js';
import { GetDisciplinesUseCase } from './application/GetDisciplinesUseCase.js';
import { UpdateDisciplineUseCase } from './application/UpdateDisciplineUseCase.js';
import { DeleteDisciplineUseCase } from './application/DeleteDisciplineUseCase.js';
import { DisciplineController } from './delivery/DisciplineController.js';
import { PostgresEquipmentLoanRepository } from './infrastructure/PostgresEquipmentLoanRepository.js';
import { EquipmentLoanValidator } from './domain/services/EquipmentLoanValidator.js';
import { CreateEquipmentLoanUseCase } from './application/NewEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from './application/UpdateEquipmentLoanUseCase.js';
import { GetEquipmentLoansUseCase } from './application/GetEquipmentLoansUseCase.js';
import { DeleteEquipmentLoanUseCase } from './application/DeleteEquipmentLoanUseCase.js';
import { EquipmentLoanController } from './delivery/EquipmentLoanController.js';
import { PostgresMedicalCertificateRepository } from './infrastructure/PostgresMedicalCertificateRepository.js';
import { MedicalCertificateValidator } from './domain/services/MedicalCertificateValidator.js';
import { CreateMedicalCertificateUseCase } from './application/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificatesUseCase } from './application/GetMedicalCertificateUseCase.js';
import { UpdateMedicalCertificateUseCase } from './application/UpdateMedicalCertificateUseCase.js';
import { DeleteMedicalCertificateUseCase } from './application/DeleteMedicalCertificateUseCase.js';
import { MedicalCertificateController } from './delivery/MedicalCertificateController.js';
import { PostgresLockerRepository } from './infrastructure/PostgresLockerRepository.js';
import { LockerValidator } from './domain/services/LockerValidator.js';
import { CreateLockerUseCase } from './application/NewLockerUseCase.js';
import { GetLockersUseCase } from './application/GetLockersUseCase.js';
import { UpdateLockerUseCase } from './application/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from './application/DeleteLockerUseCase.js';
import { LockerController } from './delivery/LockerController.js';

export function buildApp() {
    const server = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
                }
                : undefined,
        },
    });

    server.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    //member
    const memberRepo = new PostgresMemberRepository();
    const memberValidator = new MemberValidator(memberRepo);
    const paymentRepo = new PostgresPaymentRepository();
    const paymentValidator = new PaymentValidator();
    const createPaymentUseCase = new CreatePaymentUseCase(paymentRepo, paymentValidator, memberRepo);
    const updatePaymentUseCase = new UpdatePaymentUseCase(paymentRepo, memberRepo, paymentValidator);
    const getPaymentUseCase = new GetPaymentByIdUseCase(paymentRepo);
    const getPaymentsUseCase = new GetPaymentsUseCase(paymentRepo);
    const cancelPaymentUseCase = new CancelPaymentUseCase(paymentRepo, paymentValidator);
    const disciplineRepo = new PostgresDisciplineRepository();
    const disciplineValidator = new DisciplineValidator();


    const sportRepo = new PostgresSportRepository();
    const sportValidator = new SportValidator(sportRepo);

    const createMemberUseCase = new CreateMemberUseCase(memberRepo, memberValidator);
    const getMembersUseCase = new GetMembersUseCase(memberRepo);
    const updateMemberUseCase = new UpdateMemberUseCase(memberRepo, memberValidator);
    const deleteMemberUseCase = new DeleteMemberUseCase(memberRepo);
    const createSportUseCase = new CreateSportUseCase(sportRepo, sportValidator);
    const getSportsUseCase = new GetSportsUseCase(sportRepo);
    const updateSportUseCase = new UpdateSportUseCase(sportRepo, sportValidator);
    const deleteSportUseCase = new DeleteSportUseCase(sportRepo);

    const createDisciplineUseCase = new CreateDisciplineUseCase(disciplineRepo, disciplineValidator, memberRepo);
    const getDisciplinesUseCase = new GetDisciplinesUseCase(disciplineRepo);
    const updateDisciplinesUseCase = new UpdateDisciplineUseCase(disciplineRepo, disciplineValidator, memberRepo);
    const deleteDisciplineUseCase = new DeleteDisciplineUseCase(disciplineRepo);

    const equipmentLoanRepo = new PostgresEquipmentLoanRepository();
    const equipmentLoanValidator = new EquipmentLoanValidator(memberRepo);
    const createEquipmentLoanUseCase = new CreateEquipmentLoanUseCase(equipmentLoanRepo, equipmentLoanValidator);
    const updateEquipmentLoanUseCase = new UpdateEquipmentLoanUseCase(equipmentLoanRepo, equipmentLoanValidator);
    const getEquipmentLoansUseCase = new GetEquipmentLoansUseCase(equipmentLoanRepo);
    const deleteEquipmentLoanUseCase = new DeleteEquipmentLoanUseCase(equipmentLoanRepo);
    const equipmentLoanController = new EquipmentLoanController(createEquipmentLoanUseCase, updateEquipmentLoanUseCase, getEquipmentLoansUseCase, deleteEquipmentLoanUseCase);
    
    const lockerRepo = new PostgresLockerRepository();
    const lockerValidator = new LockerValidator(lockerRepo);
    const createLockerUseCase = new CreateLockerUseCase(lockerRepo, lockerValidator);
    const getLockersUseCase = new GetLockersUseCase(lockerRepo);
    const updateLockerUseCase = new UpdateLockerUseCase(lockerRepo, lockerValidator, memberRepo);
    const deleteLockerUseCase = new DeleteLockerUseCase(lockerRepo);
    const lockerController = new LockerController(
        createLockerUseCase,
        getLockersUseCase,
        updateLockerUseCase,
        deleteLockerUseCase
    );

    const memberController = new MemberController(
        createMemberUseCase,
        getMembersUseCase,
        updateMemberUseCase,
        deleteMemberUseCase
    );

    const sportController = new SportController(
        createSportUseCase,
        getSportsUseCase,
        updateSportUseCase,
        deleteSportUseCase
    );

    const disciplineController = new DisciplineController(
        createDisciplineUseCase,
        getDisciplinesUseCase,
        updateDisciplinesUseCase,
        deleteDisciplineUseCase
    );

    const paymentController = new PaymentController(
        createPaymentUseCase,
        getPaymentsUseCase,
        getPaymentUseCase,
        updatePaymentUseCase,
        cancelPaymentUseCase
    );

    //medical certificate
    const medicalCertificateRepo = new PostgresMedicalCertificateRepository();
    const medicalCertificateValidator = new MedicalCertificateValidator(memberRepo);
    const createMedicalCertificateUseCase = new CreateMedicalCertificateUseCase(medicalCertificateRepo, medicalCertificateValidator);
    const getMedicalCertificatesUseCase = new GetMedicalCertificatesUseCase(medicalCertificateRepo);
    const updateMedicalCertificateUseCase = new UpdateMedicalCertificateUseCase(medicalCertificateRepo, medicalCertificateValidator);
    const deleteMedicalCertificateUseCase = new DeleteMedicalCertificateUseCase(medicalCertificateRepo);

    const medicalCertificateController = new MedicalCertificateController(
        createMedicalCertificateUseCase,
        getMedicalCertificatesUseCase,
        updateMedicalCertificateUseCase,
        deleteMedicalCertificateUseCase,
    );

    //rutas member
    server.get('/api/v1/socios', memberController.getAll.bind(memberController));
    server.post('/api/v1/socios', memberController.create.bind(memberController));
    server.put('/api/v1/socios/:id', memberController.update.bind(memberController));
    server.delete('/api/v1/socios/:id', memberController.delete.bind(memberController));

    //rutas payment
    server.post('/api/v1/payments', paymentController.create.bind(paymentController));
    server.get('/api/v1/payments', paymentController.findAll.bind(paymentController));
    server.get('/api/v1/payments/:id', paymentController.findById.bind(paymentController));
    server.put('/api/v1/payments/:id', paymentController.update.bind(paymentController));
    server.patch('/api/v1/payments/:id', paymentController.cancel.bind(paymentController));


    server.get('/api/v1/sports', sportController.getAll.bind(sportController));
    server.post('/api/v1/sports', sportController.create.bind(sportController));
    server.put('/api/v1/sports/:id', sportController.update.bind(sportController));
    server.delete('/api/v1/sports/:id', sportController.delete.bind(sportController));
    server.get('/api/v1/disciplines', disciplineController.getAll.bind(disciplineController));
    server.post('/api/v1/disciplines', disciplineController.create.bind(disciplineController));
    server.put('/api/v1/disciplines/:id', disciplineController.update.bind(disciplineController));
    server.delete('/api/v1/disciplines/:id', disciplineController.delete.bind(disciplineController));

    //rutas medical certificate
    server.post('/api/v1/medical-certificates', medicalCertificateController.create.bind(medicalCertificateController));
    server.get('/api/v1/medical-certificates', medicalCertificateController.getAll.bind(medicalCertificateController));
    server.put('/api/v1/medical-certificates/:id', medicalCertificateController.update.bind(medicalCertificateController));
    server.delete('/api/v1/medical-certificates/:id', medicalCertificateController.delete.bind(medicalCertificateController));
    //rutas equipment loans
    server.post('/api/v1/equipment-loans', equipmentLoanController.create.bind(equipmentLoanController));

    server.put('/api/v1/equipment-loans/:id', equipmentLoanController.update.bind(equipmentLoanController));
    server.get('/api/v1/equipment-loans', equipmentLoanController.getAll.bind(equipmentLoanController));
    server.delete('/api/v1/equipment-loans/:id', equipmentLoanController.delete.bind(equipmentLoanController));
    //rutas lockers
    server.get('/api/v1/lockers', lockerController.getAll.bind(lockerController));
    server.post('/api/v1/lockers', lockerController.create.bind(lockerController));
    server.put('/api/v1/lockers/:id', lockerController.update.bind(lockerController));
    server.delete('/api/v1/lockers/:id', lockerController.delete.bind(lockerController));
    
    server.get('/', async (req, rep) => {
        rep.status(200).send({ msg: 'asd' })
    });

    server.get('/health', async (req, rep) => {
        rep.status(200).send({ status: 'ok' });
    });

    return server;
}

// Solo iniciar el servidor si el script se ejecuta directamente (no cuando es importado por vitest)
if (process.argv[1] && (process.argv[1].endsWith('app.ts') || process.argv[1].endsWith('app.js'))) {
    const server = buildApp();
    const port = parseInt(process.env.PORT || '3000', 10);

    server.listen({ port, host: '0.0.0.0' }, () =>
        server.log.info(`API server running on http://localhost:${port}`)
    );

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            await server.close();
            process.exit(0);
        });
    });
}
