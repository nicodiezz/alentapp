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
import { equipmentLoansService } from "../services/equipment-loans";
import { membersService } from "../services/members";
import type {
  CreateEquipmentLoanRequest,
  EquipmentLoanDTO,
  EquipmentLoanStatus,
  MemberDTO,
  UpdateEquipmentLoanRequest,
} from "@alentapp/shared";
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

type EquipmentLoanFormData = CreateEquipmentLoanRequest & {
  status: EquipmentLoanStatus;
};

const initialFormData: EquipmentLoanFormData = {
  item_name: "",
  loan_date: "",
  due_date: "",
  member_id: "",
  status: "Loaned",
};

const statusCollection = createListCollection({
  items: [
    { label: "Prestado", value: "Loaned" },
    { label: "Devuelto", value: "Returned" },
    { label: "Danado", value: "Damaged" },
  ],
});

export function EquipmentLoansView() {
  const [equipmentLoans, setEquipmentLoans] = useState<EquipmentLoanDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEquipmentLoanId, setEditingEquipmentLoanId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EquipmentLoanFormData>(initialFormData);

  const membersCollection = createListCollection({
    items: members.map((member) => ({ label: member.name, value: member.id })),
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loansData, membersData] = await Promise.all([
        equipmentLoansService.getAll(),
        membersService.getAll(),
      ]);
      setEquipmentLoans(loansData);
      setMembers(membersData);
    } catch (err: any) {
      setError(err.message || "Error al cargar los datos");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingEquipmentLoanId(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditModal = (equipmentLoan: EquipmentLoanDTO) => {
    setEditingEquipmentLoanId(equipmentLoan.id);
    setFormData({
      item_name: equipmentLoan.item_name,
      loan_date: equipmentLoan.loan_date,
      due_date: equipmentLoan.due_date,
      member_id: equipmentLoan.member_id,
      status: equipmentLoan.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingEquipmentLoanId) {
        await equipmentLoansService.update(
          editingEquipmentLoanId,
          formData as UpdateEquipmentLoanRequest,
        );
      } else {
        await equipmentLoansService.create({
          item_name: formData.item_name,
          loan_date: formData.loan_date,
          due_date: formData.due_date,
          member_id: formData.member_id,
        });
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Error al guardar el prestamo de equipamiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEquipmentLoan = async (id: string) => {
    if (!window.confirm("Estas seguro de que deseas eliminar este prestamo? Esta accion no se puede deshacer.")) {
      return;
    }

    try {
      await equipmentLoansService.delete(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Error al eliminar el prestamo de equipamiento");
    }
  };

  const getMemberName = (memberId: string) => {
    return members.find((member) => member.id === memberId)?.name ?? memberId;
  };

  const getStatusBadgeColors = (status: EquipmentLoanStatus) => {
    if (status === "Returned") {
      return { bg: "green.50", color: "green.700" };
    }
    if (status === "Damaged") {
      return { bg: "red.50", color: "red.700" };
    }
    return { bg: "orange.50", color: "orange.700" };
  };

  const getStatusLabel = (status: EquipmentLoanStatus) => {
    if (status === "Returned") {
      return "Devuelto";
    }
    if (status === "Damaged") {
      return "Danado";
    }
    return "Prestado";
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Prestamos de Equipamiento</Heading>
            <Text color="fg.muted" fontSize="md">
              Registro de equipamiento prestado a los socios del club.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Nuevo prestamo
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingEquipmentLoanId ? "Editar prestamo de equipamiento" : "Nuevo prestamo de equipamiento"}
              </DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Socio" required>
                  <SelectRoot
                    collection={membersCollection}
                    value={formData.member_id ? [formData.member_id] : []}
                    onValueChange={(e) => setFormData({ ...formData, member_id: e.value[0] })}
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione un socio" />
                    </SelectTrigger>
                    <SelectContent>
                      {membersCollection.items.map((item) => (
                        <SelectItem item={item} key={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>
                <Field label="Equipamiento" required>
                  <Input
                    placeholder="Ej. Pelota de futbol"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha de prestamo" required>
                  <Input
                    type="date"
                    value={formData.loan_date}
                    onChange={(e) => setFormData({ ...formData, loan_date: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha de devolucion" required>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </Field>
                {editingEquipmentLoanId && (
                  <Field label="Estado" required>
                    <SelectRoot
                      collection={statusCollection}
                      value={[formData.status]}
                      onValueChange={(e) =>
                        setFormData({ ...formData, status: e.value[0] as EquipmentLoanStatus })
                      }
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Seleccione un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusCollection.items.map((item) => (
                          <SelectItem item={item} key={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Field>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingEquipmentLoanId ? "Guardar Cambios" : "Crear prestamo"}
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
                <Text color="fg.muted">Cargando prestamos...</Text>
              </Stack>
            </Center>
          ) : equipmentLoans.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron prestamos registrados.</Text>
                <Button variant="ghost" onClick={fetchData}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Equipamiento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha prestamo</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha devolucion</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {equipmentLoans.map((equipmentLoan) => {
                  const badgeColors = getStatusBadgeColors(equipmentLoan.status);

                  return (
                    <Table.Row key={equipmentLoan.id} _hover={{ bg: "bg.muted/30" }}>
                      <Table.Cell fontWeight="semibold" color="fg.emphasized">
                        {getMemberName(equipmentLoan.member_id)}
                      </Table.Cell>
                      <Table.Cell color="fg.muted">{equipmentLoan.item_name}</Table.Cell>
                      <Table.Cell color="fg.muted">{equipmentLoan.loan_date}</Table.Cell>
                      <Table.Cell color="fg.muted">{equipmentLoan.due_date}</Table.Cell>
                      <Table.Cell>
                        <Box
                          display="inline-block"
                          px="2"
                          py="0.5"
                          borderRadius="md"
                          bg={badgeColors.bg}
                          color={badgeColors.color}
                          fontSize="xs"
                          fontWeight="bold"
                        >
                          {getStatusLabel(equipmentLoan.status)}
                        </Box>
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        <HStack gap="2" justify="flex-end">
                          <IconButton
                            variant="ghost"
                            size="sm"
                            aria-label="Editar prestamo"
                            onClick={() => openEditModal(equipmentLoan)}
                          >
                            <LuPencil />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            colorPalette="red"
                            aria-label="Eliminar prestamo"
                            onClick={() => handleDeleteEquipmentLoan(equipmentLoan.id)}
                          >
                            <LuTrash2 />
                          </IconButton>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}
