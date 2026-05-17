import {
    Table,
    Button,
    Heading,
    HStack,
    IconButton,
    Stack,
    Text,
    Box,
    Flex,
    Spinner,
    Center,
    Input,
} from "@chakra-ui/react";
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import { medicalCertificatesService } from "../services/medicalCertificates";
import { membersService } from "../services/members";
import type { MedicalCertificateDTO, CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest, MemberDTO } from "@alentapp/shared";
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogActionTrigger,
    DialogCloseTrigger,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import {
    SelectRoot,
    SelectTrigger,
    SelectValueText,
    SelectContent,
    SelectItem,
    createListCollection,
} from "../components/ui/select";

export function MedicalCertificatesView() {
    const [certificates, setCertificates] = useState<MedicalCertificateDTO[]>([]);
    const [members, setMembers] = useState<MemberDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for the modal
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateMedicalCertificateRequest & { is_validated?: boolean }>({
        issue_date: "",
        expiry_date: "",
        doctor_license: "",
        member_id: "",
    });

    const membersCollection = createListCollection({
        items: members.map((m) => ({ label: m.name, value: m.id })),
    });

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [certificatesData, membersData] = await Promise.all([
                medicalCertificatesService.getAll(),
                membersService.getAll(),
            ]);
            setCertificates(certificatesData);
            setMembers(membersData);
        } catch (err: any) {
            setError(err.message || "Error al cargar los datos");
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingCertificateId(null);
        setFormData({ issue_date: "", expiry_date: "", doctor_license: "", member_id: "" });
        setIsDialogOpen(true);
    };

    const openEditModal = (cert: MedicalCertificateDTO) => {
        setEditingCertificateId(cert.id);
        setFormData({
            issue_date: cert.issue_date,
            expiry_date: cert.expiry_date,
            doctor_license: cert.doctor_license,
            member_id: cert.member_id,
            is_validated: cert.is_validated,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingCertificateId) {
                await medicalCertificatesService.update(editingCertificateId, formData as UpdateMedicalCertificateRequest);
            } else {
                await medicalCertificatesService.create(formData as CreateMedicalCertificateRequest);
            }
            setIsDialogOpen(false);
            fetchData();
        } catch (err: any) {
            alert(err.message || "Error al guardar el certificado medico");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCertificate = async (id: string) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar este certificado médico? Esta acción no se puede deshacer.")) {
            try {
                await medicalCertificatesService.delete(id);
                fetchData();
            } catch (err: any) {
                alert(err.message || "Error al eliminar el certificado medico");
            }
        }
    };

    const getMemberName = (memberId: string) => {
        return members.find((m) => m.id === memberId)?.name ?? memberId;
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
            <Stack gap="8">
                <Flex justify="space-between" align="center">
                    <Stack gap="1">
                        <Heading size="2xl" fontWeight="bold">Certificados Medicos</Heading>
                        <Text color="fg.muted" fontSize="md">
                            Registra y gestiona los certificados medicos de los socios.
                        </Text>
                    </Stack>
                    <HStack gap="3">
                        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
                            <LuRefreshCw /> Actualizar
                        </Button>
                        <Button colorPalette="blue" size="md" onClick={openCreateModal}>
                            <LuPlus /> Registrar Certificado Medico
                        </Button>
                    </HStack>
                </Flex>

                {/* Modal para agregar/editar certificado medico */}
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingCertificateId ? "Editar Certificado Medico" : "Agregar Certificado Medico"}</DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            <Stack gap="4">
                                <Field label="Miembro" required={!editingCertificateId}>
                                    {editingCertificateId ? (
                                        <Input
                                            value={getMemberName(formData.member_id)}
                                            disabled
                                        />
                                    ) : (
                                        <SelectRoot
                                            collection={membersCollection}
                                            value={formData.member_id ? [formData.member_id] : []}
                                            onValueChange={(e) => setFormData({ ...formData, member_id: e.value[0] })}
                                        >
                                            <SelectTrigger>
                                                <SelectValueText placeholder="Seleccione un miembro" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {membersCollection.items.map((item) => (
                                                    <SelectItem item={item} key={item.value}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectRoot>
                                    )}
                                </Field>
                                <Field label="Fecha de Emision" required>
                                    <Input
                                        type="date"
                                        value={formData.issue_date}
                                        onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                        required
                                    />
                                </Field>
                                <Field label="Fecha de Vencimiento" required>
                                    <Input
                                        type="date"
                                        value={formData.expiry_date}
                                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                                        required
                                    />
                                </Field>
                                <Field label="Matricula del Medico" required>
                                    <Input
                                        placeholder="Ej. MP 12345"
                                        value={formData.doctor_license}
                                        onChange={(e) => setFormData({ ...formData, doctor_license: e.target.value })}
                                        required
                                    />
                                </Field>
                                {editingCertificateId && (
                                    <Field label="Validado">
                                        <input
                                            type="checkbox"
                                            checked={!!(formData as UpdateMedicalCertificateRequest).is_validated}
                                            onChange={(e) => setFormData({ ...formData, is_validated: e.target.checked })}
                                        />
                                    </Field>
                                )}
                            </Stack>
                        </DialogBody>
                        <DialogFooter>
                            <DialogActionTrigger asChild>
                                <Button variant="outline">Cancelar</Button>
                            </DialogActionTrigger>
                            <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                                {editingCertificateId ? "Guardar Cambios" : "Crear Certificado"}
                            </Button>
                        </DialogFooter>
                        <DialogCloseTrigger />
                    </form>
                </DialogContent>

                {error && (
                    <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
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
                                <Text color="fg.muted">Cargando certificados...</Text>
                            </Stack>
                        </Center>
                    ) : certificates.length === 0 ? (
                        <Center h="300px">
                            <Stack align="center" gap="4">
                                <Text color="fg.muted">No se encontraron certificados medicos.</Text>
                                <Button variant="ghost" onClick={fetchData}>Reintentar</Button>
                            </Stack>
                        </Center>
                    ) : (
                        <Table.Root size="md" variant="line" interactive>
                            <Table.Header>
                                <Table.Row bg="bg.muted/50">
                                    <Table.ColumnHeader py="4">Miembro</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Fecha de Emision</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Fecha de Vencimiento</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Matricula Medico</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Validado</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {certificates.map((cert) => (
                                    <Table.Row key={cert.id} _hover={{ bg: "bg.muted/30" }}>
                                        <Table.Cell fontWeight="semibold" color="fg.emphasized">{getMemberName(cert.member_id)}</Table.Cell>
                                        <Table.Cell color="fg.muted">{cert.issue_date}</Table.Cell>
                                        <Table.Cell color="fg.muted">{cert.expiry_date}</Table.Cell>
                                        <Table.Cell color="fg.muted">{cert.doctor_license}</Table.Cell>
                                        <Table.Cell>
                                            <Box
                                                display="inline-block"
                                                px="2"
                                                py="0.5"
                                                borderRadius="md"
                                                bg={cert.is_validated ? 'green.50' : 'orange.50'}
                                                color={cert.is_validated ? 'green.700' : 'orange.700'}
                                                fontSize="xs"
                                                fontWeight="bold"
                                            >
                                                {cert.is_validated ? 'Si' : 'No'}
                                            </Box>
                                        </Table.Cell>
                                        <Table.Cell textAlign="end">
                                            <HStack gap="2" justify="flex-end">
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label="Editar certificado"
                                                    onClick={() => openEditModal(cert)}
                                                >
                                                    <LuPencil />
                                                </IconButton>
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    colorPalette="red"
                                                    aria-label="Eliminar certificado"
                                                    onClick={() => handleDeleteCertificate(cert.id)}
                                                >
                                                    <LuTrash2 />
                                                </IconButton>
                                            </HStack>
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