import {
    Table,
    Button,
    Heading,
    HStack,
    Stack,
    Text,
    Box,
    Flex,
    Spinner,
    Center,
    Input,
    IconButton,
} from '@chakra-ui/react';
import { LuPlus, LuRefreshCw, LuPencil } from 'react-icons/lu';
import { useEffect, useState } from 'react';
import { paymentsService } from '../services/payments';
import type {
    PaymentDTO,
    CreatePaymentRequest,
    CreatePaymentStatus,
    UpdatePaymentRequest,
} from '@alentapp/shared';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogActionTrigger,
    DialogCloseTrigger,
} from '../components/ui/dialog';
import { Field } from '../components/ui/field';
import {
    SelectRoot,
    SelectTrigger,
    SelectValueText,
    SelectContent,
    SelectItem,
    createListCollection,
} from '../components/ui/select';
import { membersService } from '../services/members';


export function PaymentsView() {
    const [payments, setPayments] = useState<PaymentDTO[]>([]);
    const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreatePaymentRequest & { status?: CreatePaymentStatus }>({
        member_id: '',
        amount: 0,
        month: 0,
        year: 0,
        payment_date: '',
        due_date: '',
        status: 'Pending',
    });

    const statusCollection = createListCollection({
        items: [
            { label: 'Pendiente', value: 'Pending' },
            { label: 'Pagado', value: 'Paid' },
        ],
    });

    const statusMap = new Map(
        statusCollection.items.map((status) => [status.value, status.label]),
    );

    const membersCollection = createListCollection({
        items: members.map((member) => ({
            label: member.name,
            value: member.id,
        })),
    });

    const membersMap = new Map(
        members.map((member) => [member.id, member.name]),
    );

    const fetchPayments = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await paymentsService.findAll();
            setPayments(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar los pagos');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMembers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await membersService.getAll();
            setMembers(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar los socios');
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingPaymentId(null);
        setFormData({
            member_id: '',
            amount: 0,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            payment_date: '',
            due_date: '',
            status: 'Pending',
        });
        setIsDialogOpen(true);
    };

    const openEditModal = (payment: PaymentDTO) => {
        setEditingPaymentId(payment.id);
        setFormData({
            member_id: payment.member_id,
            amount: payment.amount,
            month: payment.month,
            year: payment.year,
            payment_date: payment.payment_date === 'No pagado' ? '' : payment.payment_date,
            due_date: payment.due_date,
            status: payment.status as CreatePaymentStatus,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                payment_date: formData.payment_date || null,
                due_date: formData.due_date,
            };
            if (editingPaymentId) {
                await paymentsService.update(editingPaymentId, payload as UpdatePaymentRequest);
            } else {
                await paymentsService.create(payload as CreatePaymentRequest);
            }
            setIsDialogOpen(false);
            fetchPayments();
        } catch (err: any) {
            alert(err.message || 'Error al guardar el pago');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        fetchMembers();
        fetchPayments();
    }, []);

    return (
        <DialogRoot
            open={isDialogOpen}
            onOpenChange={(e) => setIsDialogOpen(e.open)}
        >
            <Stack gap="8">
                <Flex justify="space-between" align="center">
                    <Stack gap="1">
                        <Heading size="2xl" fontWeight="bold">
                            Administración de Pagos
                        </Heading>
                        <Text color="fg.muted" fontSize="md">
                            Gestiona los pagos de los miembros de Alentapp.
                        </Text>
                    </Stack>
                    <HStack gap="3">
                        <Button
                            variant="outline"
                            onClick={fetchPayments}
                            disabled={isLoading}
                        >
                            <LuRefreshCw />
                            Actualizar
                        </Button>
                        <Button
                            colorPalette="blue"
                            size="md"
                            onClick={openCreateModal}
                        >
                            <LuPlus />
                            Agregar Pago
                        </Button>
                    </HStack>
                </Flex>

                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>
                                {editingPaymentId ? 'Editar Pago' : 'Agregar Nuevo Pago'}
                            </DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            <Stack gap="4">
                                <Field label="Miembro" required>
                                    <SelectRoot
                                        collection={membersCollection}
                                        value={[formData.member_id]}
                                        onValueChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                member_id: e.value[0] as string,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValueText placeholder="Seleccione un miembro" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {membersCollection.items.map((member) => (
                                                <SelectItem item={member} key={member.value}>
                                                    {member.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectRoot>
                                </Field>
                                <Field label="Monto" required>
                                    <Input
                                        type="number"
                                        placeholder="Ej. 5000"
                                        value={formData.amount}
                                        onChange={(e) =>
                                            setFormData({ ...formData, amount: Number(e.target.value) })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Mes" required>
                                    <Input
                                        type="number"
                                        placeholder="Ej. 5"
                                        value={formData.month}
                                        onChange={(e) =>
                                            setFormData({ ...formData, month: Number(e.target.value) })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Año" required>
                                    <Input
                                        type="number"
                                        placeholder="Ej. 2026"
                                        value={formData.year}
                                        onChange={(e) =>
                                            setFormData({ ...formData, year: Number(e.target.value) })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Fecha de Vencimiento" required>
                                    <Input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, due_date: e.target.value })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Fecha de Pago">
                                    <Input
                                        type="date"
                                        value={formData.payment_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, payment_date: e.target.value })
                                        }
                                    />
                                </Field>
                                <Field label="Estado" required>
                                    <SelectRoot
                                        collection={statusCollection}
                                        value={[formData.status ?? 'Pending']}
                                        onValueChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                status: e.value[0] as CreatePaymentStatus,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValueText placeholder="Seleccione un estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusCollection.items.map((stat) => (
                                                <SelectItem item={stat} key={stat.value}>
                                                    {stat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectRoot>
                                </Field>
                            </Stack>
                        </DialogBody>
                        <DialogFooter>
                            <DialogActionTrigger asChild>
                                <Button variant="outline">Cancelar</Button>
                            </DialogActionTrigger>
                            <Button
                                type="submit"
                                colorPalette="blue"
                                loading={isSubmitting}
                            >
                                {editingPaymentId ? 'Guardar Cambios' : 'Crear Pago'}
                            </Button>
                        </DialogFooter>
                        <DialogCloseTrigger />
                    </form>
                </DialogContent>

                {error && (
                    <Box
                        p="4"
                        bg="red.50"
                        color="red.700"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="red.200"
                    >
                        <Text fontWeight="bold">Error:</Text>
                        <Text>{error}</Text>
                    </Box>
                )}

                <Box
                    bg="bg.panel"
                    borderRadius="xl"
                    boxShadow="sm"
                    borderWidth="1px"
                    overflow="hidden"
                    minH="300px"
                    position="relative"
                >
                    {isLoading ? (
                        <Center h="300px">
                            <Stack align="center" gap="4">
                                <Spinner size="xl" color="blue.500" />
                                <Text color="fg.muted">Cargando pagos...</Text>
                            </Stack>
                        </Center>
                    ) : payments.length === 0 ? (
                        <Center h="300px">
                            <Stack align="center" gap="4">
                                <Text color="fg.muted">No se encontraron pagos.</Text>
                                <Button variant="ghost" onClick={fetchPayments}>Reintentar</Button>
                            </Stack>
                        </Center>
                    ) : (
                        <Table.Root size="md" variant="line" interactive>
                            <Table.Header>
                                <Table.Row bg="bg.muted/50">
                                    <Table.ColumnHeader py="4">Nombre</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Monto</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Mes</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Año</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Fecha de vencimiento</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Fecha de pago</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {payments.map((payment) => (
                                    <Table.Row key={payment.id} _hover={{ bg: 'bg.muted/30' }}>
                                        <Table.Cell fontWeight="semibold" color="fg.emphasized">{membersMap.get(payment.member_id)}</Table.Cell>
                                        <Table.Cell color="fg.muted">${payment.amount}</Table.Cell>
                                        <Table.Cell color="fg.muted">{payment.month}</Table.Cell>
                                        <Table.Cell color="fg.muted">{payment.year}</Table.Cell>
                                        <Table.Cell color="fg.muted">{payment.due_date}</Table.Cell>
                                        <Table.Cell color="fg.muted">{payment.payment_date === 'No pagado' ? 'No pagado' : payment.payment_date}</Table.Cell>
                                        <Table.Cell>
                                            <Box
                                                display="inline-block"
                                                px="2"
                                                py="0.5"
                                                borderRadius="md"
                                                bg={payment.status === 'Paid' ? 'green.50' : 'orange.50'}
                                                color={payment.status === 'Paid' ? 'green.700' : 'orange.700'}
                                                fontSize="xs"
                                                fontWeight="bold"
                                            >
                                                {statusMap.get(payment.status) ?? payment.status}
                                            </Box>
                                        </Table.Cell>
                                        <Table.Cell textAlign="end">
                                            <IconButton
                                                variant="ghost"
                                                size="sm"
                                                aria-label="Editar pago"
                                                onClick={() => openEditModal(payment)}
                                            >
                                                <LuPencil />
                                            </IconButton>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    )}
                </Box>
            </Stack>
        </DialogRoot>
    );
}